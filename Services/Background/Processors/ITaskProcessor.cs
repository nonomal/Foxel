using Foxel.Models.DataBase;
using System.Threading.Tasks;

namespace Foxel.Services.Background.Processors
{
    public interface ITaskProcessor
    {
        Task ProcessAsync(BackgroundTask task);
    }
}
